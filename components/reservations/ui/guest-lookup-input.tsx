"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search, UserPlus, X, Check, Loader2 } from "lucide-react"
import { useNewReservationForm } from "../form-context"

type DocumentType = "id_card" | "passport"

export function GuestLookupInput() {
  const {
    guestSearch,
    setGuestSearch,
    selectedGuest,
    setSelectedGuest,
    showNewGuestForm,
    setShowNewGuestForm,
    newGuestData,
    setNewGuestData,
    trimmedSearch,
    isSearchingGuests,
    guestMatches,
    isNewGuestFirstNameValid,
    isNewGuestLastNameValid,
    newGuestPhoneDigitsCount,
    isNewGuestPhoneValid,
    isNewGuestEmailValid,
    emailLocalPart,
    emailDomainSuggestions,
    isCountrySuggestionsOpen,
    setIsCountrySuggestionsOpen,
    countrySuggestions,
    isNewGuestPassportNumberValid,
    isNewGuestIdCardNumberValid,
    hasNewGuestIdentification,
    handlePhoneFocus,
    handleGuestNameChange,
    handlePhoneChange,
    handleEmailChange,
    applyEmailDomain,
    handleCountryChange,
    applyCountrySuggestion,
    handlePassportNumberChange,
    handleIdCardNumberChange,
  } = useNewReservationForm()
  const [touched, setTouched] = React.useState({
    firstName: false,
    lastName: false,
    phone: false,
    email: false,
    passportNumber: false,
    idCardNumber: false,
  })
  const [documentType, setDocumentType] = React.useState<DocumentType>("id_card")

  React.useEffect(() => {
    if (!showNewGuestForm) {
      setTouched({
        firstName: false,
        lastName: false,
        phone: false,
        email: false,
        passportNumber: false,
        idCardNumber: false,
      })
      setDocumentType("id_card")
    }
  }, [showNewGuestForm])

  const markTouched = (field: keyof typeof touched) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const showFirstNameError = touched.firstName && Boolean(newGuestData.firstName) && !isNewGuestFirstNameValid
  const showLastNameError = touched.lastName && Boolean(newGuestData.lastName) && !isNewGuestLastNameValid
  const phoneHasUserDigits = newGuestPhoneDigitsCount > 0
  const showPhoneError = touched.phone && phoneHasUserDigits && !isNewGuestPhoneValid
  const showEmailError = touched.email && Boolean(newGuestData.email) && !isNewGuestEmailValid
  const showPassportError =
    touched.passportNumber &&
    Boolean(newGuestData.passportNumber) &&
    !isNewGuestPassportNumberValid
  const showIdCardError =
    touched.idCardNumber &&
    Boolean(newGuestData.idCardNumber) &&
    !isNewGuestIdCardNumberValid
  const showIdentificationError =
    touched[documentType === "id_card" ? "idCardNumber" : "passportNumber"] && !hasNewGuestIdentification

  const handleDocumentTypeChange = (value: string) => {
    if (value !== "id_card" && value !== "passport") return

    setDocumentType(value)
    setNewGuestData((current) => ({
      ...current,
      idCardNumber: value === "id_card" ? current.idCardNumber : "",
      passportNumber: value === "passport" ? current.passportNumber : "",
    }))
    setTouched((current) => ({
      ...current,
      idCardNumber: false,
      passportNumber: false,
    }))
  }

  return (
    <div className="space-y-4">
      {/* Guest search */}
      <div className="space-y-2">
        <Label htmlFor="guest-search">Пошук гостя</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="guest-search"
            value={guestSearch}
            onChange={(e) => {
              setGuestSearch(e.target.value)
              setSelectedGuest(null)
            }}
            placeholder="Прізвище, телефон, документ…"
            className="pl-9"
            disabled={Boolean(selectedGuest)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Спочатку шукайте гостя в базі, щоб не створити дублікат і зберегти історію проживань.
        </p>
      </div>

      {selectedGuest ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {selectedGuest.first_name[0]}
              {selectedGuest.last_name[0]}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {selectedGuest.first_name} {selectedGuest.last_name}
                </span>
                {selectedGuest.is_vip && (
                  <Badge variant="secondary" className="text-xs">
                    VIP
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1 text-xs">
                  <Check className="h-3 w-3" /> Повторний гість
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedGuest.email || "—"} · {selectedGuest.phone || "—"}
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedGuest(null)
              setGuestSearch("")
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Скинути вибір гостя</span>
          </Button>
        </div>
      ) : (
        <>
          {trimmedSearch.length >= 2 && (
            <div className="rounded-lg border bg-card">
              {isSearchingGuests ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Пошук гостя…
                </div>
              ) : guestMatches && guestMatches.length > 0 ? (
                <ul className="divide-y">
                  {guestMatches.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGuest(g)
                          setShowNewGuestForm(false)
                        }}
                        className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">
                            {g.first_name} {g.last_name}
                            {g.is_vip && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                VIP
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {g.email || "—"} · {g.phone || "—"}
                          </div>
                          {(g.passport_number || g.id_number) && (
                            <div className="text-xs text-muted-foreground">
                              {g.passport_number ? `Паспорт: ${g.passport_number}` : `ID-картка: ${g.id_number}`}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Обрати
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  Збігів не знайдено. Ви можете створити нового гостя нижче.
                </div>
              )}
            </div>
          )}

          <div>
            <Button
              type="button"
              variant={showNewGuestForm ? "secondary" : "outline"}
              onClick={() => setShowNewGuestForm(!showNewGuestForm)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {showNewGuestForm ? "Сховати форму нового гостя" : "Створити нового гостя"}
            </Button>
          </div>

          {showNewGuestForm && (
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Імʼя *</Label>
                  <Input
                    id="firstName"
                    value={newGuestData.firstName}
                    onChange={handleGuestNameChange("firstName")}
                    onBlur={() => markTouched("firstName")}
                    maxLength={50}
                    aria-invalid={showFirstNameError}
                  />
                  {showFirstNameError ? (
                    <p className="text-xs text-destructive">Мінімум 2 літери, без цифр і спецсимволів.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Можна українські або англійські літери, дефіс і апостроф.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Прізвище *</Label>
                  <Input
                    id="lastName"
                    value={newGuestData.lastName}
                    onChange={handleGuestNameChange("lastName")}
                    onBlur={() => markTouched("lastName")}
                    maxLength={50}
                    aria-invalid={showLastNameError}
                  />
                  {showLastNameError ? (
                    <p className="text-xs text-destructive">Мінімум 2 літери, без цифр і спецсимволів.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Можна українські або англійські літери, дефіс і апостроф.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={newGuestData.phone}
                    onFocus={handlePhoneFocus}
                    onChange={handlePhoneChange}
                    onBlur={() => markTouched("phone")}
                    placeholder="+380 (##) ###-##-##"
                    maxLength={19}
                    aria-invalid={showPhoneError}
                  />
                  {showPhoneError && (
                    <p className="text-xs text-destructive">
                      Введіть 9 цифр після +380. Літери та зайві символи не додаються.
                    </p>
                  )}
                  {!showPhoneError && !isNewGuestPhoneValid && (
                    <p className="text-xs text-muted-foreground">
                      Український номер у форматі +380 (##) ###-##-##.
                    </p>
                  )}
                  {isNewGuestPhoneValid && (
                    <p className="text-xs text-muted-foreground">Номер заповнений у правильному форматі.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={newGuestData.email}
                      onChange={handleEmailChange}
                      onBlur={() => markTouched("email")}
                      placeholder="name@gmail.com"
                      aria-invalid={showEmailError}
                    />
                    {emailDomainSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 overflow-hidden rounded-md border bg-popover shadow-md">
                        {emailDomainSuggestions.map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyEmailDomain(domain)}
                          >
                            {emailLocalPart}@{domain}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {showEmailError ? (
                    <p className="text-xs text-destructive">Email має бути латиницею у форматі name@example.com.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Дозволені: англійські літери, цифри, крапка, дефіс, підкреслення, плюс і один знак @.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Країна</Label>
                  <div className="relative">
                    <Input
                      id="country"
                      value={newGuestData.country}
                      onFocus={() => setIsCountrySuggestionsOpen(true)}
                      onBlur={() => setIsCountrySuggestionsOpen(false)}
                      onChange={handleCountryChange}
                      placeholder="Україна"
                      autoComplete="off"
                    />
                    {isCountrySuggestionsOpen && countrySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 overflow-hidden rounded-md border bg-popover shadow-md">
                        {countrySuggestions.map((country) => (
                          <button
                            key={country}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyCountrySuggestion(country)}
                          >
                            {country}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Почніть вводити країну і виберіть варіант зі списку або залиште свій.
                  </p>
                </div>
                <div className="space-y-3">
                  <Label>Документ, що посвідчує особу *</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={documentType}
                    onValueChange={handleDocumentTypeChange}
                    className="grid w-full grid-cols-2"
                    aria-label="Тип документа"
                  >
                    <ToggleGroupItem value="id_card" aria-label="ID-картка">
                      ID-картка
                    </ToggleGroupItem>
                    <ToggleGroupItem value="passport" aria-label="Паспорт">
                      Паспорт
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {documentType === "id_card" ? (
                    <div className="space-y-2">
                      <Label htmlFor="idCardNumber">Номер ID-картки</Label>
                      <Input
                        id="idCardNumber"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{9}"
                        maxLength={9}
                        value={newGuestData.idCardNumber}
                        onChange={handleIdCardNumberChange}
                        onBlur={() => markTouched("idCardNumber")}
                        placeholder="123456789"
                        aria-invalid={showIdCardError || showIdentificationError}
                      />
                      {showIdCardError ? (
                        <p className="text-xs text-destructive">Номер ID-картки має містити рівно 9 цифр.</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">9 цифр, без пробілів і розділових знаків.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="passportNumber">Номер паспорта</Label>
                      <Input
                        id="passportNumber"
                        type="text"
                        maxLength={8}
                        value={newGuestData.passportNumber}
                        onChange={handlePassportNumberChange}
                        onBlur={() => markTouched("passportNumber")}
                        placeholder="КК123456"
                        aria-invalid={showPassportError || showIdentificationError}
                      />
                      {showPassportError ? (
                        <p className="text-xs text-destructive">Вкажіть 2 українські літери серії та 6 цифр.</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Наприклад: КК123456.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {showIdentificationError && (
                <p className="text-xs text-destructive">Заповніть номер ID-картки або паспорта.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Перед створенням система ще раз перевірить збіг за контактами та документами.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
