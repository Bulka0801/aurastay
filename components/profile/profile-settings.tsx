"use client";

import type React from "react";
import { useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Shield,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatRole } from "@/lib/localization";
import {
  UA_PHONE_PREFIX,
  formatPersonName,
  formatUaPhone,
  generateStrongPassword,
  getUaPhoneNationalDigits,
  isValidOptionalUaPhone,
  isValidPersonName,
  validatePassword,
} from "@/lib/validation";

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string | null;
};

type PasswordVisibility = {
  current: boolean;
  next: boolean;
  confirm: boolean;
};

type ProfileSettingsProps = {
  profile: Profile;
  authEmail: string;
};

export function ProfileSettings({ profile, authEmail }: ProfileSettingsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState<PasswordVisibility>({
    current: false,
    next: false,
    confirm: false,
  });
  const firstNameIsInvalid = Boolean(
    firstName && !isValidPersonName(firstName)
  );
  const lastNameIsInvalid = Boolean(lastName && !isValidPersonName(lastName));
  const phoneDigitsCount = getUaPhoneNationalDigits(phone).length;
  const phoneIsInvalid = Boolean(
    phoneDigitsCount > 0 && !isValidOptionalUaPhone(phone)
  );
  const nextPasswordValidation = validatePassword(nextPassword);

  const updatePasswordVisibility = (field: keyof PasswordVisibility) => {
    setShowPassword((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();

    if (
      !isValidPersonName(trimmedFirstName) ||
      !isValidPersonName(trimmedLastName)
    ) {
      setProfileError(
        "Імʼя та прізвище мають містити мінімум 2 літери без цифр і спецсимволів."
      );
      return;
    }

    if (!isValidOptionalUaPhone(trimmedPhone)) {
      setProfileError("Телефон має бути у форматі +380 (##) ###-##-##.");
      return;
    }

    setIsSavingProfile(true);

    const { data, error } = await supabase.rpc("update_own_profile", {
      p_first_name: trimmedFirstName,
      p_last_name: trimmedLastName,
      p_phone: trimmedPhone || null,
    });

    setIsSavingProfile(false);

    if (error) {
      setProfileError(error.message);
      return;
    }

    const updatedProfile = Array.isArray(data) ? data[0] : data;

    if (!updatedProfile) {
      setProfileError("Профіль не було оновлено. Спробуйте ще раз.");
      return;
    }

    setFirstName(updatedProfile.first_name);
    setLastName(updatedProfile.last_name);
    setPhone(updatedProfile.phone ?? "");
    setProfileMessage("Зміни збережено.");
    router.refresh();
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generateStrongPassword();

    setNextPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setPasswordError(null);
    setPasswordMessage(null);
    setCopyMessage(
      "Пароль згенеровано. Скопіюйте його перед натисканням “Змінити пароль”, бо після збереження поля буде очищено."
    );
  };

  const handleCopyPassword = async () => {
    if (!nextPassword) {
      setCopyMessage(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(nextPassword);
      setCopyMessage(
        "Пароль скопійовано. Збережіть його в безпечному місці перед зміною."
      );
    } catch {
      setPasswordError("Не вдалося скопіювати пароль. Скопіюйте його вручну.");
    }
  };

  const handlePasswordChange = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!currentPassword || !nextPassword || !confirmPassword) {
      setPasswordError("Заповніть усі поля пароля.");
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordError("Новий пароль має містити щонайменше 8 символів.");
      return;
    }

    if (!nextPasswordValidation.isValid) {
      setPasswordError(nextPasswordValidation.errors.join(" "));
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordError("Новий пароль і підтвердження не збігаються.");
      return;
    }

    setIsChangingPassword(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: currentPassword,
    });

    if (signInError) {
      setIsChangingPassword(false);
      setPasswordError("Старий пароль введено неправильно.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: nextPassword,
    });

    setIsChangingPassword(false);

    if (updateError) {
      setPasswordError(getAuthErrorMessage(updateError.message));
      return;
    }

    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordMessage("Пароль змінено. Поля очищено з міркувань безпеки.");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Налаштування профілю
        </h1>
        <p className="text-muted-foreground">
          Керуйте особистими даними та безпекою акаунта.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Особисті дані
            </CardTitle>
            <CardDescription>
              Дані використовуються для ідентифікації працівника в системі.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleProfileSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Імʼя</Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(formatPersonName(event.target.value))
                    }
                    maxLength={50}
                    aria-invalid={firstNameIsInvalid}
                    required
                  />
                  {firstNameIsInvalid ? (
                    <p className="text-xs text-destructive">
                      Мінімум 2 літери, без цифр і спецсимволів.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Можна українські або англійські літери, дефіс і апостроф.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Прізвище</Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(event) =>
                      setLastName(formatPersonName(event.target.value))
                    }
                    maxLength={50}
                    aria-invalid={lastNameIsInvalid}
                    required
                  />
                  {lastNameIsInvalid ? (
                    <p className="text-xs text-destructive">
                      Мінімум 2 літери, без цифр і спецсимволів.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Можна українські або англійські літери, дефіс і апостроф.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={authEmail}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onFocus={() => {
                      if (!phone) setPhone(`${UA_PHONE_PREFIX} (`);
                    }}
                    onBlur={() => {
                      if (phone && getUaPhoneNationalDigits(phone).length === 0)
                        setPhone("");
                    }}
                    onChange={(event) =>
                      setPhone(formatUaPhone(event.target.value))
                    }
                    placeholder="+380 (##) ###-##-##"
                    maxLength={19}
                    aria-invalid={phoneIsInvalid}
                  />
                  {phoneDigitsCount > 0 && phoneIsInvalid && (
                    <p className="text-xs text-destructive">
                      Введіть 9 цифр після +380.
                    </p>
                  )}
                  {phoneDigitsCount === 0 && (
                    <p className="text-xs text-muted-foreground"></p>
                  )}
                </div>
              </div>

              {profileError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}
              {profileMessage && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-emerald-900">
                    {profileMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Зберегти зміни
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BriefcaseBusiness className="h-5 w-5" />
              Службова інформація
            </CardTitle>
            <CardDescription>Дані доступу та статус акаунта.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Роль</p>
              <p className="font-medium">{formatRole(profile.role)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Статус акаунта</p>
              <Badge variant={profile.is_active ? "default" : "secondary"}>
                {profile.is_active ? "Активний" : "Неактивний"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Дата створення
              </p>
              <p className="font-medium">{formatDate(profile.created_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5" />
            Безпека
          </CardTitle>
          <CardDescription>Зміна пароля для входу в систему.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 lg:grid-cols-3"
            onSubmit={handlePasswordChange}
          >
            <PasswordInput
              id="current_password"
              label="Старий пароль"
              value={currentPassword}
              isVisible={showPassword.current}
              autoComplete="current-password"
              onChange={setCurrentPassword}
              onToggleVisibility={() => updatePasswordVisibility("current")}
            />
            <PasswordInput
              id="next_password"
              label="Новий пароль"
              value={nextPassword}
              isVisible={showPassword.next}
              autoComplete="new-password"
              onChange={setNextPassword}
              onToggleVisibility={() => updatePasswordVisibility("next")}
              action={
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                  >
                    Задати автоматично
                  </Button>
                  {nextPassword && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPassword}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              }
            />
            <PasswordInput
              id="confirm_password"
              label="Підтвердження нового пароля"
              value={confirmPassword}
              isVisible={showPassword.confirm}
              autoComplete="new-password"
              onChange={setConfirmPassword}
              onToggleVisibility={() => updatePasswordVisibility("confirm")}
            />

            <div className="space-y-4 lg:col-span-3">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {passwordMessage && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-emerald-900">
                    {passwordMessage}
                  </AlertDescription>
                </Alert>
              )}
              {nextPassword && (
                <p
                  className={
                    nextPasswordValidation.isValid
                      ? "text-xs text-muted-foreground"
                      : "text-xs text-destructive"
                  }
                >
                  {nextPasswordValidation.isValid
                    ? nextPasswordValidation.label
                    : nextPasswordValidation.errors.join(" ")}
                </p>
              )}
              {copyMessage && (
                <p className="text-xs text-amber-700">{copyMessage}</p>
              )}
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Змінити пароль
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("new password should be different")) {
    return "Новий пароль має відрізнятися від старого.";
  }

  return message;
}

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  isVisible: boolean;
  autoComplete: string;
  action?: React.ReactNode;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

function PasswordInput({
  id,
  label,
  value,
  isVisible,
  autoComplete,
  action,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
          autoComplete={autoComplete}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3"
          aria-label={isVisible ? "Приховати пароль" : "Показати пароль"}
          onClick={onToggleVisibility}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
