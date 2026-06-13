import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { SymbolView } from 'expo-symbols';
import { ConfirmationResult, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { auth, db, firebaseConfig } from '@/lib/firebase';
import { useTheme } from '@/hooks/use-theme';

type AuthModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Mode = 'login' | 'register' | 'forgot';
type Step = 'form' | 'code' | 'newpass';

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const theme = useTheme();
  const { login, register, resetPassword } = useAuth();

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('form');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    setPhone(formatted);
  }

  async function handleLogin() {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Informe um número de celular válido.');
      return;
    }
    if (!password) {
      Alert.alert('Atenção', 'Informe sua senha.');
      return;
    }
    const result = await login(cleanPhone, password);
    if (result) {
      onSuccess();
      handleClose();
    } else {
      Alert.alert('Acesso negado', 'Telefone ou senha incorretos.');
    }
  }

  async function sendSmsCode(cleanPhone: string) {
    if (!recaptchaVerifier.current) {
      Alert.alert('Erro', 'Verificador não inicializado. Feche e tente novamente.');
      return false;
    }
    try {
      const result = await signInWithPhoneNumber(auth, `+55${cleanPhone}`, recaptchaVerifier.current);
      setConfirmationResult(result);
      return true;
    } catch (e: unknown) {
      console.error('[SMS]', e);
      const code = (e as { code?: string }).code ?? '';
      const msg = {
        'auth/operation-not-allowed': 'Autenticação por telefone não está ativada no Firebase Console.',
        'auth/invalid-phone-number': 'Número de telefone inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
        'auth/quota-exceeded': 'Cota de SMS excedida.',
        'auth/captcha-check-failed': 'Verificação reCAPTCHA falhou. Tente novamente.',
        'auth/missing-phone-number': 'Informe o número de telefone.',
      }[code] ?? `Erro (${code || 'desconhecido'}): ${e instanceof Error ? e.message : String(e)}`;
      Alert.alert('Erro ao enviar SMS', msg);
      return false;
    }
  }

  async function handleSendRegisterCode() {
    if (name.trim().length < 2) {
      Alert.alert('Atenção', 'Informe seu nome completo.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Informe um número de celular válido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    setSending(true);
    const ok = await sendSmsCode(cleanPhone);
    if (ok) setStep('code');
    setSending(false);
  }

  async function handleSendForgotCode() {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Informe um número de celular válido.');
      return;
    }
    // Verify account exists before spending SMS quota
    try {
      const snap = await getDoc(doc(db, 'users', cleanPhone));
      if (!snap.exists()) {
        Alert.alert('Não encontrado', 'Nenhuma conta cadastrada com este número.');
        return;
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar o número. Tente novamente.');
      return;
    }
    setSending(true);
    const ok = await sendSmsCode(cleanPhone);
    if (ok) setStep('code');
    setSending(false);
  }

  async function handleVerifyCode() {
    if (smsCode.length !== 6) {
      Alert.alert('Atenção', 'Informe o código de 6 dígitos recebido por SMS.');
      return;
    }
    setVerifying(true);
    try {
      await confirmationResult!.confirm(smsCode);
      if (mode === 'forgot') {
        setStep('newpass');
      } else {
        const cleanPhone = phone.replace(/\D/g, '');
        await register(name, cleanPhone, password);
        onSuccess();
        handleClose();
      }
    } catch {
      Alert.alert('Código inválido', 'O código está incorreto ou expirou. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSaveNewPassword() {
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const ok = await resetPassword(cleanPhone, password);
      if (!ok) {
        Alert.alert('Erro', 'Não foi possível redefinir a senha.');
        return;
      }
      Alert.alert('Sucesso', 'Senha redefinida! Faça login com a nova senha.');
      handleClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleResendCode() {
    setSmsCode('');
    setConfirmationResult(null);
    setStep('form');
  }

  function handleClose() {
    setName(''); setPhone(''); setPassword(''); setConfirmPassword('');
    setSmsCode(''); setStep('form'); setConfirmationResult(null); setMode('login');
    onClose();
  }

  function goToForgot() {
    setPhone(''); setPassword(''); setConfirmPassword('');
    setSmsCode(''); setStep('form'); setConfirmationResult(null);
    setMode('forgot');
  }

  function switchRegisterLogin() {
    setStep('form'); setSmsCode(''); setConfirmationResult(null);
    setMode(mode === 'login' ? 'register' : 'login');
  }

  const maskedPhone = phone.replace(/\D/g, '').replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');

  function getTitle() {
    if (mode === 'login') return 'Entrar';
    if (mode === 'register') return step === 'code' ? 'Verificar número' : 'Criar conta';
    if (mode === 'forgot') {
      if (step === 'code') return 'Verificar número';
      if (step === 'newpass') return 'Nova senha';
      return 'Recuperar senha';
    }
    return '';
  }

  function getSubtitle() {
    if (mode === 'login') return 'Informe seu celular e senha para continuar.';
    if (mode === 'forgot') {
      if (step === 'form') return 'Informe seu celular para receber o código de verificação.';
      if (step === 'code') return `Enviamos um código para ${maskedPhone}. Informe abaixo.`;
      return 'Escolha uma nova senha para sua conta.';
    }
    if (step === 'code') return `Enviamos um código para ${maskedPhone}. Informe abaixo.`;
    return 'Preencha seus dados para criar sua conta.';
  }

  function getActionLabel() {
    if (mode === 'login') return 'Entrar';
    if (mode === 'forgot') {
      if (step === 'form') return sending ? 'Enviando...' : 'Enviar código SMS';
      if (step === 'code') return verifying ? 'Verificando...' : 'Verificar';
      return saving ? 'Salvando...' : 'Redefinir senha';
    }
    if (step === 'code') return verifying ? 'Verificando...' : 'Verificar';
    return sending ? 'Enviando...' : 'Enviar código SMS';
  }

  function handleActionPress() {
    if (mode === 'login') return handleLogin();
    if (mode === 'forgot') {
      if (step === 'form') return handleSendForgotCode();
      if (step === 'code') return handleVerifyCode();
      return handleSaveNewPassword();
    }
    if (step === 'code') return handleVerifyCode();
    return handleSendRegisterCode();
  }

  const isLoading = sending || verifying || saving;

  return (
    <>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification
        appVerificationDisabledForTesting={__DEV__}
      />

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <ThemedView style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}>
            <View style={styles.header}>
              <ThemedText type="subtitle">{getTitle()}</ThemedText>
              <Pressable onPress={handleClose} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.closeButton}>
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={16}
                    tintColor={theme.text}
                  />
                </ThemedView>
              </Pressable>
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {getSubtitle()}
            </ThemedText>

            {/* LOGIN */}
            {mode === 'login' && (
              <ThemedView style={styles.form}>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={theme.textSecondary}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Senha"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </ThemedView>
              </ThemedView>
            )}

            {/* REGISTER — form */}
            {mode === 'register' && step === 'form' && (
              <ThemedView style={styles.form}>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Seu nome completo"
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={theme.textSecondary}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Senha (mínimo 6 caracteres)"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="next"
                  />
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirmar senha"
                    placeholderTextColor={theme.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSendRegisterCode}
                  />
                </ThemedView>
              </ThemedView>
            )}

            {/* REGISTER / FORGOT — code */}
            {(mode === 'register' || mode === 'forgot') && step === 'code' && (
              <ThemedView style={styles.form}>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.codeInput, { color: theme.text }]}
                    placeholder="000000"
                    placeholderTextColor={theme.textSecondary}
                    value={smsCode}
                    onChangeText={(t) => setSmsCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                    autoFocus
                    maxLength={6}
                  />
                </ThemedView>
              </ThemedView>
            )}

            {/* FORGOT — phone */}
            {mode === 'forgot' && step === 'form' && (
              <ThemedView style={styles.form}>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={theme.textSecondary}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSendForgotCode}
                    autoFocus
                  />
                </ThemedView>
              </ThemedView>
            )}

            {/* FORGOT — new password */}
            {mode === 'forgot' && step === 'newpass' && (
              <ThemedView style={styles.form}>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Nova senha (mínimo 6 caracteres)"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="next"
                    autoFocus
                  />
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={theme.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSaveNewPassword}
                  />
                </ThemedView>
              </ThemedView>
            )}

            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              onPress={handleActionPress}
              disabled={isLoading}>
              <ThemedView style={[styles.actionButtonInner, { backgroundColor: theme.text }]}>
                <ThemedText style={[styles.actionButtonText, { color: theme.background }]}>
                  {getActionLabel()}
                </ThemedText>
              </ThemedView>
            </Pressable>

            {/* Reenviar código */}
            {step === 'code' && (
              <Pressable
                onPress={handleResendCode}
                style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Não recebeu o código?{' '}
                  <ThemedText type="small" style={styles.switchLink}>Reenviar</ThemedText>
                </ThemedText>
              </Pressable>
            )}

            {/* Login ↔ Cadastro */}
            {(mode === 'login' || mode === 'register') && step === 'form' && (
              <Pressable
                onPress={switchRegisterLogin}
                style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
                  <ThemedText type="small" style={styles.switchLink}>
                    {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
                  </ThemedText>
                </ThemedText>
              </Pressable>
            )}

            {/* Esqueceu a senha */}
            {mode === 'login' && (
              <Pressable
                onPress={goToForgot}
                style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Esqueceu sua senha?{' '}
                  <ThemedText type="small" style={styles.switchLink}>Recuperar</ThemedText>
                </ThemedText>
              </Pressable>
            )}

            {/* Voltar para login (no forgot form) */}
            {mode === 'forgot' && step === 'form' && (
              <Pressable
                onPress={() => setMode('login')}
                style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Lembrei!{' '}
                  <ThemedText type="small" style={styles.switchLink}>Entrar</ThemedText>
                </ThemedText>
              </Pressable>
            )}
          </KeyboardAvoidingView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: {
    flex: 1,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  subtitle: { marginBottom: Spacing.two },
  form: { gap: Spacing.two },
  inputWrapper: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: { fontSize: 16, lineHeight: 24, fontWeight: '500', letterSpacing: 0, paddingVertical: Spacing.one },
  codeInput: { textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 6 },
  actionButton: { marginTop: Spacing.two },
  actionButtonInner: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
  switchButton: { alignItems: 'center', paddingVertical: Spacing.two },
  switchLink: { color: '#3c87f7' },
  pressed: { opacity: 0.7 },
});
