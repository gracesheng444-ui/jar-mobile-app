import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'zh';

const LANGUAGE_STORAGE_KEY = 'jar-app-language';

export interface I18nStrings {
  appTitle: string;
  loading: string;
  tabs: {
    jars: string;
    start: string;
    settings: string;
  };
  signOut: string;
  exitDemo: string;
  resetDemo: string;
  resettingDemo: string;
  errorScreenSignOut: string;
  statusLabel: Record<'open' | 'complete' | 'incomplete_grace' | 'incomplete_expired' | 'repaired', string>;
  cycleEndsIn(duration: string): string;
  graceClosesIn(duration: string): string;
  graceExplainer: string;
  todaysTaps: string;
  you: string;
  partnerFallback: string;
  repairThisCycle: string;
  missedCycleRepairsLeft(n: number): string;
  useRepair: string;
  repairedButton: string;
  noRepairsLeftButton: string;
  waitingOnPartnerRepair: string;
  streakLabel: string;
  current: string;
  longest: string;
  starsOfCapacity(count: number, capacity: number | string): string;

  calendar: {
    todayTab: string;
    calendarTab: string;
    loading: string;
    legendMissed: string;
    legendToday: string;
    legendRepaired: string;
    dayModalNoNote: string;
    close: string;
  };

  paired: {
    heading: string;
    subtitle(partnerName: string): string;
    continueButton: string;
  };

  memory: {
    heading: string;
    placeholder: string;
    save: string;
    meLabel: string;
    tapToUnlock: string;
  };

  meetupDate: {
    label: string;
    change: string;
    resizeNote: string;
    save: string;
    cancel: string;
  };

  reunion: {
    heading: string;
    subtitle(partnerName: string): string;
    notesHeading: string;
    noNotes: string;
    continueButton: string;
  };

  signIn: {
    signInHeading: string;
    signUpHeading: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    confirmPasswordPlaceholder: string;
    signInButton: string;
    signingIn: string;
    signUpButton: string;
    signingUp: string;
    switchToSignUp: string;
    switchToSignIn: string;
    passwordTooShort: string;
    passwordsDontMatch: string;
    checkEmailToConfirm: string;
    confirmationCodePlaceholder: string;
    confirmAccountButton: string;
    confirmingAccount: string;
    forgotPassword: string;
    sendResetLink: string;
    sendingResetLink: string;
    checkEmailForReset: string;
    backToSignIn: string;
    tryDemo: string;
    settingUpDemo: string;
  };

  resetPassword: {
    heading: string;
    subtitle: string;
    newPasswordPlaceholder: string;
    confirmPasswordPlaceholder: string;
    save: string;
    saving: string;
  };

  jarList: {
    heading: string;
    withPartner(name: string): string;
    yourPartnerFallback: string;
    waitingForPartner: string;
    daysUntilMeet(days: number): string;
    todayIsTheDay: string;
    shareCodeToInvite(code: string): string;
    noTargetDate: string;
    startNewJar: string;
    emptyState: string;
  };

  pairing: {
    heading: string;
    whenMeetingUp: string;
    datePlaceholder: string;
    pickWithinDays(maxDays: number): string;
    enterRealFutureDate: string;
    createNewJar: string;
    or: string;
    joinWithCode: string;
    enterPartnerCode: string;
    codePlaceholder: string;
    joinJarButton: string;
    back: string;
    waitingHeading: string;
    shareCodeLabel: string;
    copyCode: string;
    codeCopied: string;
    shareCode: string;
    shareMessage(code: string): string;
    autoUpdateHint: string;
    starColorLabel: string;
  };

  settings: {
    heading: string;
    nameLabel: string;
    namePlaceholder: string;
    nameUnset: string;
    save: string;
    emailLabel: string;
    emailUnavailable: string;
    languageLabel: string;
    profilePictureLabel: string;
    english: string;
    chinese: string;
    changePasswordLabel: string;
    currentPasswordPlaceholder: string;
    newPasswordPlaceholder: string;
    confirmNewPasswordPlaceholder: string;
    changePasswordButton: string;
    changingPassword: string;
    passwordChanged: string;
    deleteAccountLabel: string;
    deleteAccountWarning: string;
    deleteAccountButton: string;
    deleteAccountConfirmPrompt: string;
    deleteAccountConfirmButton: string;
    deletingAccount: string;
    cancel: string;
  };

  leaveJar: {
    link: string;
    confirmText: string;
    cancel: string;
    yesLeave: string;
  };

  avatarPicker: {
    choosePhoto: string;
    uploading: string;
    permissionDenied: string;
    uploadFailed: string;
    skipForNow: string;
    usingDefaultPicture: string;
    changePicture: string;
    cropHeading: string;
    useCroppedPhoto: string;
  };

  setupProfile: {
    heading: string;
    subtitle: string;
    namePlaceholder: string;
    continueButton: string;
  };

  notifications: {
    tapReminderTitle: string;
    tapReminderBody(remainingLabel: string): string;
    cycleResetTitle: string;
    cycleResetBody: string;
    remainingLabels: Record<'12h' | '3h' | '1h' | '30m' | '5m', string>;
  };
}

const en: I18nStrings = {
  appTitle: 'Shared Memory Jar',
  loading: 'Loading…',
  tabs: {
    jars: 'Jars',
    start: 'Start / Join',
    settings: 'Settings',
  },
  signOut: 'Sign out',
  exitDemo: 'Exit demo',
  resetDemo: 'Reset demo',
  resettingDemo: 'Resetting…',
  errorScreenSignOut: 'Sign out and start over',
  statusLabel: {
    open: 'Open — waiting for taps',
    complete: 'Complete',
    incomplete_grace: 'Missed — grace period',
    incomplete_expired: 'Expired',
    repaired: 'Repaired',
  },
  cycleEndsIn: (duration) => `Cycle ends in ${duration}`,
  graceClosesIn: (duration) => `Grace window closes in ${duration}`,
  graceExplainer: 'Repair to pick your streak back up where it left off — or tap instead to let it go and start a new one.',
  todaysTaps: "Today's taps",
  you: 'You',
  partnerFallback: 'Partner',
  repairThisCycle: 'Repair this cycle',
  missedCycleRepairsLeft: (n) => `You missed this cycle — ${n} repair${n === 1 ? '' : 's'} left`,
  useRepair: 'Use repair',
  repairedButton: 'Repaired',
  noRepairsLeftButton: "You don't have any repairs left this month",
  waitingOnPartnerRepair: 'Waiting on your partner to repair or tap.',
  streakLabel: 'Streak',
  current: 'Current',
  longest: 'Longest',
  starsOfCapacity: (count, capacity) => `${count} of ${capacity} stars`,

  calendar: {
    todayTab: 'Today',
    calendarTab: 'Calendar',
    loading: 'Loading history…',
    legendMissed: 'Missed',
    legendToday: 'Today',
    legendRepaired: 'Repaired',
    dayModalNoNote: 'No note',
    close: 'Close',
  },

  paired: {
    heading: 'The jar is ready ^_^',
    subtitle: (partnerName) => `You and ${partnerName} are all set — time to start counting down together.`,
    continueButton: "Let's go",
  },

  memory: {
    heading: "Today's memory",
    placeholder: "What's on your mind today? (optional)",
    save: 'Save',
    meLabel: 'Me',
    tapToUnlock: 'Tap for today to add a note — one per person, so make it count.',
  },

  meetupDate: {
    label: 'Meet-up date',
    change: 'Change',
    resizeNote: 'Changing this resizes every star to fit the new countdown.',
    save: 'Save',
    cancel: 'Cancel',
  },

  reunion: {
    heading: 'You made it ^_^',
    subtitle: (partnerName) => `The day is here — you and ${partnerName} made it to the meet-up.`,
    notesHeading: 'A look back at what you wrote',
    noNotes: "You didn't leave any notes this time — next jar, maybe.",
    continueButton: 'Keep going',
  },

  signIn: {
    signInHeading: 'Sign in',
    signUpHeading: 'Create an account',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: 'Password',
    confirmPasswordPlaceholder: 'Confirm password',
    signInButton: 'Sign in',
    signingIn: 'Signing in…',
    signUpButton: 'Sign up',
    signingUp: 'Signing up…',
    switchToSignUp: "Don't have an account? Sign up",
    switchToSignIn: 'Already have an account? Sign in',
    passwordTooShort: 'Password must be at least 6 characters.',
    passwordsDontMatch: "Passwords don't match.",
    checkEmailToConfirm: "Check your email — click the confirmation link, or enter the code from it below.",
    confirmationCodePlaceholder: 'Confirmation code',
    confirmAccountButton: 'Confirm',
    confirmingAccount: 'Confirming…',
    forgotPassword: 'Forgot password?',
    sendResetLink: 'Send reset link',
    sendingResetLink: 'Sending…',
    checkEmailForReset: "Check your email for a reset link — it'll bring you back here to set a new password.",
    backToSignIn: 'Back to sign in',
    tryDemo: 'Try a live demo — no account needed',
    settingUpDemo: 'Setting up your demo jar…',
  },

  resetPassword: {
    heading: 'Set a new password',
    subtitle: 'Choose a new password for your account.',
    newPasswordPlaceholder: 'New password',
    confirmPasswordPlaceholder: 'Confirm password',
    save: 'Save password',
    saving: 'Saving…',
  },

  jarList: {
    heading: 'Your jars',
    withPartner: (name) => `Jar with ${name}`,
    yourPartnerFallback: 'your partner',
    waitingForPartner: 'Waiting for partner',
    daysUntilMeet: (days) => (days === 1 ? '1 day till we meet again' : `${days} days till we meet again`),
    todayIsTheDay: 'Today is the day!',
    shareCodeToInvite: (code) => `Share code ${code} to invite them`,
    noTargetDate: 'No target date set',
    startNewJar: '+ Start a new jar',
    emptyState: "You don't have a jar yet — tap Start / Join below to create or join one.",
  },

  pairing: {
    heading: 'Start your jar',
    whenMeetingUp: 'When are you meeting up?',
    datePlaceholder: 'YYYY-MM-DD',
    pickWithinDays: (maxDays) => `Pick a date within ${maxDays} days from now.`,
    enterRealFutureDate: 'Enter a real date in the future.',
    createNewJar: 'Create a new jar',
    or: 'or',
    joinWithCode: 'Join with a code',
    enterPartnerCode: "Enter your partner's invite code",
    codePlaceholder: 'ABC123',
    joinJarButton: 'Join jar',
    back: 'Back',
    waitingHeading: 'Waiting for your partner',
    shareCodeLabel: 'Share this code with them:',
    copyCode: 'Copy',
    codeCopied: 'Copied!',
    shareCode: 'Share',
    shareMessage: (code) => `Join my Shared Memory Jar! Use invite code: ${code}`,
    autoUpdateHint: 'This screen updates automatically once they join.',
    starColorLabel: 'Your star color for this jar',
  },

  settings: {
    heading: 'Settings',
    nameLabel: 'Your name',
    namePlaceholder: 'Type your name',
    nameUnset: 'Not set',
    save: 'Save',
    emailLabel: 'Email',
    emailUnavailable: 'Unavailable',
    languageLabel: 'Language',
    profilePictureLabel: 'Profile picture',
    english: 'English',
    chinese: '中文',
    changePasswordLabel: 'Change password',
    currentPasswordPlaceholder: 'Current password',
    newPasswordPlaceholder: 'New password',
    confirmNewPasswordPlaceholder: 'Confirm new password',
    changePasswordButton: 'Change password',
    changingPassword: 'Changing…',
    passwordChanged: 'Password changed.',
    deleteAccountLabel: 'Delete account',
    deleteAccountWarning: 'This permanently deletes your account. If you share a jar, it deletes that jar (and its history) for your partner too. This cannot be undone.',
    deleteAccountButton: 'Delete account',
    deleteAccountConfirmPrompt: 'Are you sure? This cannot be undone.',
    deleteAccountConfirmButton: 'Yes, delete my account',
    deletingAccount: 'Deleting…',
    cancel: 'Cancel',
  },

  leaveJar: {
    link: 'Leave this jar',
    confirmText: 'This deletes the jar (and its history) for both of you. Are you sure?',
    cancel: 'Cancel',
    yesLeave: 'Yes, leave',
  },

  avatarPicker: {
    choosePhoto: 'Choose a photo',
    uploading: 'Uploading…',
    permissionDenied: 'Photo library access is needed to pick a picture.',
    uploadFailed: 'Could not save that picture — please try again.',
    skipForNow: 'Skip for now',
    usingDefaultPicture: 'Using a default picture',
    changePicture: 'Change',
    cropHeading: 'Adjust your photo',
    useCroppedPhoto: 'Use photo',
  },

  setupProfile: {
    heading: 'Welcome!',
    subtitle: "What should your partner see you as? You can change this anytime in Settings.",
    namePlaceholder: 'Type your name',
    continueButton: 'Continue',
  },

  notifications: {
    tapReminderTitle: "Don't forget to tap",
    tapReminderBody: (remainingLabel) => `${remainingLabel} left in this cycle — drop today's star before it closes.`,
    cycleResetTitle: 'A new cycle has started',
    cycleResetBody: 'Your jar has reset for a new cycle.',
    remainingLabels: {
      '12h': '12 hours',
      '3h': '3 hours',
      '1h': '1 hour',
      '30m': '30 minutes',
      '5m': '5 minutes',
    },
  },
};

const zh: I18nStrings = {
  appTitle: '共享回忆罐',
  loading: '加载中…',
  tabs: {
    jars: '罐子',
    start: '开始 / 加入',
    settings: '设置',
  },
  signOut: '退出登录',
  exitDemo: '退出演示',
  resetDemo: '重置演示',
  resettingDemo: '正在重置…',
  errorScreenSignOut: '退出并重新开始',
  statusLabel: {
    open: '进行中 — 等待打卡',
    complete: '已完成',
    incomplete_grace: '错过 — 补救期',
    incomplete_expired: '已过期',
    repaired: '已补救',
  },
  cycleEndsIn: (duration) => `本轮还剩 ${duration}`,
  graceClosesIn: (duration) => `补救期还剩 ${duration}`,
  graceExplainer: '选择修复可以让连续记录从中断前的地方接上 — 或者直接打卡放弃修复，重新开始新的连续记录。',
  todaysTaps: '今日打卡',
  you: '你',
  partnerFallback: '对方',
  repairThisCycle: '补救这一轮',
  missedCycleRepairsLeft: (n) => `你错过了这一轮 — 还剩 ${n} 次补救机会`,
  useRepair: '使用补救',
  repairedButton: '已补救',
  noRepairsLeftButton: '本月的补救机会已用完',
  waitingOnPartnerRepair: '等待对方补救或打卡。',
  streakLabel: '连续打卡',
  current: '当前',
  longest: '最长',
  starsOfCapacity: (count, capacity) => `${count} / ${capacity} 颗星星`,

  calendar: {
    todayTab: '今天',
    calendarTab: '日历',
    loading: '正在加载历史记录…',
    legendMissed: '错过了',
    legendToday: '今天',
    legendRepaired: '已修复',
    dayModalNoNote: '没有记录',
    close: '关闭',
  },

  paired: {
    heading: '罐子准备好啦 ^_^',
    subtitle: (partnerName) => `你和 ${partnerName} 已经准备好了 — 一起开始倒数吧。`,
    continueButton: '开始吧',
  },

  memory: {
    heading: '今天的记忆',
    placeholder: '今天想记录点什么？（选填）',
    save: '保存',
    meLabel: '我',
    tapToUnlock: '完成今天的打卡后才能写一句话 —— 每人一次，好好想想再写。',
  },

  meetupDate: {
    label: '见面日期',
    change: '修改',
    resizeNote: '修改日期会重新调整所有星星的大小以适应新的倒计时。',
    save: '保存',
    cancel: '取消',
  },

  reunion: {
    heading: '你们做到了 ^_^',
    subtitle: (partnerName) => `这一天到啦 — 你和 ${partnerName} 终于要见面了。`,
    notesHeading: '回顾你们写下的点滴',
    noNotes: '这次没有留下任何记录 — 下一个罐子再记录也不迟。',
    continueButton: '继续',
  },

  signIn: {
    signInHeading: '登录',
    signUpHeading: '创建账户',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: '密码',
    confirmPasswordPlaceholder: '确认密码',
    signInButton: '登录',
    signingIn: '登录中…',
    signUpButton: '注册',
    signingUp: '注册中…',
    switchToSignUp: '还没有账户？去注册',
    switchToSignIn: '已有账户？去登录',
    passwordTooShort: '密码至少需要 6 个字符。',
    passwordsDontMatch: '两次输入的密码不一致。',
    checkEmailToConfirm: '请查收邮箱 — 点击确认链接，或在下方输入邮件中的验证码。',
    confirmationCodePlaceholder: '验证码',
    confirmAccountButton: '确认',
    confirmingAccount: '确认中…',
    forgotPassword: '忘记密码？',
    sendResetLink: '发送重置链接',
    sendingResetLink: '发送中…',
    checkEmailForReset: '请查收邮箱中的重置链接 — 点击后会回到这里设置新密码。',
    backToSignIn: '返回登录',
    tryDemo: '体验在线演示 — 无需注册',
    settingUpDemo: '正在准备演示罐子…',
  },

  resetPassword: {
    heading: '设置新密码',
    subtitle: '为你的账户设置一个新密码。',
    newPasswordPlaceholder: '新密码',
    confirmPasswordPlaceholder: '确认密码',
    save: '保存密码',
    saving: '保存中…',
  },

  jarList: {
    heading: '我的罐子',
    withPartner: (name) => `和 ${name} 一起的罐子`,
    yourPartnerFallback: '对方',
    waitingForPartner: '等待对方加入',
    daysUntilMeet: (days) => `还有 ${days} 天就能再见面啦`,
    todayIsTheDay: '就是今天啦！',
    shareCodeToInvite: (code) => `分享邀请码 ${code} 给对方`,
    noTargetDate: '还未设置目标日期',
    startNewJar: '+ 新建一个罐子',
    emptyState: '你还没有罐子 — 点击下方的「开始 / 加入」来创建或加入一个。',
  },

  pairing: {
    heading: '开始你的罐子',
    whenMeetingUp: '你们什么时候见面？',
    datePlaceholder: 'YYYY-MM-DD',
    pickWithinDays: (maxDays) => `请选择 ${maxDays} 天以内的日期。`,
    enterRealFutureDate: '请输入一个真实的未来日期。',
    createNewJar: '新建一个罐子',
    or: '或',
    joinWithCode: '使用邀请码加入',
    enterPartnerCode: '输入对方的邀请码',
    codePlaceholder: 'ABC123',
    joinJarButton: '加入罐子',
    back: '返回',
    waitingHeading: '等待对方加入',
    shareCodeLabel: '把这个邀请码分享给对方：',
    copyCode: '复制',
    codeCopied: '已复制！',
    shareCode: '分享',
    shareMessage: (code) => `快来加入我的共忆罐！邀请码：${code}`,
    autoUpdateHint: '对方加入后此页面会自动更新。',
    starColorLabel: '你在这个罐子里的星星颜色',
  },

  settings: {
    heading: '设置',
    nameLabel: '你的名字',
    namePlaceholder: '输入你的名字',
    nameUnset: '未设置',
    save: '保存',
    emailLabel: '邮箱',
    emailUnavailable: '无法获取',
    languageLabel: '语言',
    profilePictureLabel: '头像',
    english: 'English',
    chinese: '中文',
    changePasswordLabel: '修改密码',
    currentPasswordPlaceholder: '当前密码',
    newPasswordPlaceholder: '新密码',
    confirmNewPasswordPlaceholder: '确认新密码',
    changePasswordButton: '修改密码',
    changingPassword: '修改中…',
    passwordChanged: '密码已修改。',
    deleteAccountLabel: '删除账户',
    deleteAccountWarning: '这将永久删除你的账户。如果你有共享的罐子，也会为你的伴侣一并删除该罐子（及其记录）。此操作无法撤销。',
    deleteAccountButton: '删除账户',
    deleteAccountConfirmPrompt: '确定要删除吗？此操作无法撤销。',
    deleteAccountConfirmButton: '是的，删除我的账户',
    deletingAccount: '删除中…',
    cancel: '取消',
  },

  leaveJar: {
    link: '离开这个罐子',
    confirmText: '这会删除这个罐子（以及所有记录），对你们两人都是如此。确定吗？',
    cancel: '取消',
    yesLeave: '确定离开',
  },

  avatarPicker: {
    choosePhoto: '选择一张照片',
    uploading: '上传中…',
    permissionDenied: '需要相册权限才能选择图片。',
    uploadFailed: '保存图片失败，请重试。',
    skipForNow: '暂时跳过',
    usingDefaultPicture: '正在使用默认头像',
    changePicture: '更改',
    cropHeading: '调整你的照片',
    useCroppedPhoto: '使用照片',
  },

  setupProfile: {
    heading: '欢迎！',
    subtitle: '你希望对方看到的名字是什么？之后可以随时在设置中修改。',
    namePlaceholder: '输入你的名字',
    continueButton: '继续',
  },

  notifications: {
    tapReminderTitle: '别忘了打卡',
    tapReminderBody: (remainingLabel) => `本轮还剩 ${remainingLabel}，记得投下今天的星星。`,
    cycleResetTitle: '新的一轮开始了',
    cycleResetBody: '你的罐子已进入新的一轮。',
    remainingLabels: {
      '12h': '12 小时',
      '3h': '3 小时',
      '1h': '1 小时',
      '30m': '30 分钟',
      '5m': '5 分钟',
    },
  },
};

const dictionaries: Record<Language, I18nStrings> = { en, zh };

export function formatDuration(ms: number, language: Language): string {
  if (ms <= 0) return language === 'zh' ? '0秒' : '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (language === 'zh') {
    if (hours > 0) return `${hours}小时${minutes}分`;
    if (minutes > 0) return `${minutes}分${seconds}秒`;
    return `${seconds}秒`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: I18nStrings;
}

const I18nContext = createContext<I18nContextValue>({ language: 'en', setLanguage: () => {}, t: en });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'zh') setLanguageState(stored);
      } catch {
        // No stored preference (or storage unavailable) — keep the 'en' default.
      }
    })();
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18nContextValue>(() => ({ language, setLanguage, t: dictionaries[language] }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
