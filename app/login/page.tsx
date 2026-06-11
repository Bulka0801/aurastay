"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
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
import { validatePassword } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Hotel } from "lucide-react";

function getLoginErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Сталася помилка. Спробуйте ще раз.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Невірна електронна пошта або пароль.";
  }

  if (message.includes("email not confirmed")) {
    return "Підтвердьте електронну пошту перед входом.";
  }

  if (message.includes("too many requests")) {
    return "Забагато спроб входу. Спробуйте пізніше.";
  }

  if (message.includes("network")) {
    return "Не вдалося з'єднатися із сервером. Перевірте інтернет і спробуйте ще раз.";
  }

  return "Не вдалося увійти. Перевірте дані та спробуйте ще раз.";
}

function getPasswordUpdateErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("new password should be different")) {
    return "Новий пароль має відрізнятися від старого.";
  }

  if (normalizedMessage.includes("session")) {
    return "Посилання для скидання пароля застаріло. Запитайте новий лист.";
  }

  return "Не вдалося оновити пароль. Спробуйте ще раз.";
}

type AuthView = "login" | "forgot-password" | "reset-password";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isPasswordRecovery =
      searchParams.get("mode") === "recovery" ||
      searchParams.get("type") === "recovery" ||
      hashParams.get("type") === "recovery";
    const code = searchParams.get("code");
    const shouldShowPasswordReset = isPasswordRecovery || Boolean(code);

    if (shouldShowPasswordReset) {
      setView("reset-password");
      setError(null);
      setMessage(null);
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
        if (error) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            setError("Посилання для скидання пароля застаріло. Запитайте новий лист.");
          }
        }
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset-password");
        setError(null);
        setMessage(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut();
        setError("Ваш обліковий запис неактивний. Зверніться до системного адміністратора.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setError(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Введіть електронну пошту, щоб отримати лист для скидання пароля.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?mode=recovery`,
    });

    setIsLoading(false);

    if (resetError) {
      setError("Не вдалося надіслати лист. Перевірте електронну пошту та спробуйте ще раз.");
      return;
    }

    setMessage("Ми надіслали лист для скидання пароля. Відкрийте посилання в email.");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordValidation = validatePassword(newPassword);

    if (!newPassword || !confirmPassword) {
      setError("Заповніть новий пароль і підтвердження.");
      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(" "));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Новий пароль і підтвердження не збігаються.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setIsLoading(false);
      setError(getPasswordUpdateErrorMessage(updateError.message));
      return;
    }

    setMessage("Пароль оновлено. Виконується вхід...");
    router.push("/dashboard");
    router.refresh();
  };

  const title =
    view === "forgot-password"
      ? "Скидання пароля"
      : view === "reset-password"
        ? "Новий пароль"
        : "Увійти в систему";
  const description =
    view === "forgot-password"
      ? "Введіть електронну пошту, і ми надішлемо посилання для скидання пароля"
      : view === "reset-password"
        ? "Створіть новий пароль для свого акаунта"
        : "Введіть облікові дані для входу в систему";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center gap-2">
              <Hotel className="h-8 w-8 text-slate-700" />
              <h1 className="text-2xl font-bold text-slate-900">AuraStay</h1>
            </div>
            <p className="text-sm text-slate-600">
              PMS-система управління готелем
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {title}
              </CardTitle>
              <CardDescription className="text-center">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={
                  view === "forgot-password"
                    ? handlePasswordResetEmail
                    : view === "reset-password"
                      ? handleUpdatePassword
                      : handleLogin
                }
              >
                <div className="flex flex-col gap-6">
                  {view !== "reset-password" && (
                    <div className="grid gap-2">
                      <Label htmlFor="email">Електронна пошта</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  )}
                  {view === "login" && (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="password">Пароль</Label>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto px-0 py-0 text-xs"
                          onClick={() => {
                            setView("forgot-password");
                            setError(null);
                            setMessage(null);
                          }}
                        >
                          Забули пароль?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          aria-label={
                            showPassword ? "Приховати пароль" : "Показати пароль"
                          }
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  {view === "reset-password" && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="new-password">Новий пароль</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pr-10"
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            aria-label={
                              showNewPassword
                                ? "Приховати пароль"
                                : "Показати пароль"
                            }
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Підтвердіть пароль</Label>
                        <Input
                          id="confirm-password"
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}
                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                      {message}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading
                      ? view === "forgot-password"
                        ? "Надсилаємо..."
                        : view === "reset-password"
                          ? "Оновлюємо..."
                          : "Виконується вхід..."
                      : view === "forgot-password"
                        ? "Надіслати лист"
                        : view === "reset-password"
                          ? "Зберегти новий пароль"
                          : "Вхід"}
                  </Button>
                  {view !== "login" && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setView("login");
                        setError(null);
                        setMessage(null);
                      }}
                    >
                      Повернутися до входу
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
